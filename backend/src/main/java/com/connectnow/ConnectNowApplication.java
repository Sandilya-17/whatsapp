package com.connectnow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ConnectNowApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConnectNowApplication.class, args);
    }
}
